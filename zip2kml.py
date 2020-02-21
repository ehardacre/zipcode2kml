import chemdrydatasheet as cdd

#find the given zip codes and write them to the output file
def writezips(zips,out):
    for z in zips:
        try:
            f = open('all-zips/zip{0}.kml'.format(z),"r")
            #out.writelines([l for l in open("style.kml").readlines()])
            placemarkOpen = False
            trashOpen = False
            for l in f:
                tempstr = l
                if("<Placemark" in l):
                    placemarkOpen = True
                    tempstr = "<Placemark>\n<styleUrl>#KMLStyler</styleUrl>"
                if("</Placemark>" in l):
                    placemarkOpen = False
                    out.writelines(l)
                if(placemarkOpen):
                    if("<description>" in l):
                        trashOpen = True
                    if("</ExtendedData>" in l):
                        trashOpen = False
                        tempstr = ""
                    if("<name>" in l):
                        tempstr = '<name>{0}</name>\n'.format(z)
                    if not trashOpen:
                        out.writelines(tempstr)
            f.close()
        except:
            print(z)


data = sys.argv[1]
name = sys.argv[2]
zs = []
data = data.split(',')
for d in data:
    if d.isdigit() and (len(d) == 5):
        zs.append(d)
    #print(zips)

output = open('output/{0}.kml'.format(name),"w")
output.writelines([l for l in open("header.kml").readlines()])
output.writelines('<name>{0}</name>\n'.format(name))

    #zips = [80301,80302,80303,80304,80305]
writezips(zs,output)

#todo give file paths as argument?
#will python even run on windows
output.writelines([l for l in open("kml_parts/footer.kml").readlines()])
output.close()
